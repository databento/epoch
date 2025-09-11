use std::{
    fs::File,
    io::{stdin, stdout, BufRead, BufReader, BufWriter, Write},
    ops::{Range, RangeInclusive},
    path::PathBuf,
};

use chrono::{DateTime, Local, SecondsFormat, TimeZone};
use clap::Parser;

#[derive(Parser, Debug)]
#[clap(version, about)]
struct Args {
    /// Input file to read from; omit reading from STDIN or arguments
    #[clap(short, long, value_name = "FILE")]
    input: Option<PathBuf>,
    /// Output file to write to; omit writing to STDOUT
    #[clap(short, long, value_name = "FILE")]
    output: Option<PathBuf>,
    /// Threshold for detecting dates, in +/- years
    #[clap(short, long, value_name = "YEARS", default_value_t = 8)]
    threshold: i32,
    /// Localize timestamps
    #[clap(short, long)]
    local: bool,
    /// Quote formatted timestamps with `"..."`
    #[clap(short, long)]
    quote: bool,
    /// If provided, convert command line arguments instead of STDIN or a file
    #[clap(value_name = "TEXT")]
    strings: Vec<String>,
}

#[derive(Debug)]
struct Reformatter {
    min_len: usize,
    bound_s: Range<i64>,
    bound_ms: Range<i64>,
    bound_ns: Range<i64>,
    localize: bool,
    quote: bool,
}

impl Reformatter {
    fn new(threshold_years: i32, localize: bool, quote: bool) -> Self {
        // This is only used as a (generous) heuristic, so it's OK to approximate here
        let dt = chrono::Duration::days(threshold_years.abs() as i64 * 365);
        let now = chrono::offset::Utc::now();
        let upper_s: i64 = (now + dt).timestamp();
        let lower_s: i64 = (now - dt).timestamp();
        let bound_s = lower_s..upper_s;
        let bound_ms = lower_s * 1_000..upper_s * 1_000;
        let bound_ns = lower_s * 1_000_000_000..upper_s * 1_000_000_000;

        Reformatter {
            min_len: format!("{lower_s}").len(),
            bound_s,
            bound_ms,
            bound_ns,
            localize,
            quote,
        }
    }

    fn write<T: Write>(&self, writer: &mut T, line: &str) -> anyhow::Result<()> {
        const NUMBERS: RangeInclusive<char> = '0'..='9';
        // let line = line.as_bytes();
        let mut text_iter = line.char_indices().peekable();
        while let Some((text_start, _c)) = text_iter.peek() {
            let text_start = *text_start;
            // Otherwise, no timestamp found
            let Some((number_start, _)) = text_iter.find(|(_, c)| NUMBERS.contains(c)) else {
                write!(writer, "{}", &line[text_start..])?;
                break;
            };
            // Find index of first non-number character after `number_start`. We know this character
            // isn't a number, so print it as `text_after`
            let (number_end, text_after) = text_iter
                .find(|(_, c)| !NUMBERS.contains(c))
                .map(|(i, _)| (i, &line[i..i + 1]))
                .unwrap_or_else(|| (line.len(), ""));

            // If the length of the number is less than that of the lower second bound, can skip parsing
            if (number_end - number_start) >= self.min_len {
                let number: &str = &line[number_start..number_end];
                let parse_result = number.parse().ok().and_then(|n| {
                    if self.bound_s.contains(&n) {
                        Some((n * 1_000_000_000, SecondsFormat::Secs))
                    } else if self.bound_ms.contains(&n) {
                        Some((n * 1_000_000, SecondsFormat::Millis))
                    } else if self.bound_ns.contains(&n) {
                        Some((n, SecondsFormat::Nanos))
                    } else {
                        None
                    }
                });
                if let Some((time_ns, sec_fmt)) = parse_result {
                    let time = chrono::Utc.timestamp_nanos(time_ns);
                    let text_before = &line[text_start..number_start];
                    let time = if self.localize {
                        DateTime::<Local>::from(time).format(Self::rfc_format::<true>(sec_fmt))
                    } else {
                        time.format(Self::rfc_format::<false>(sec_fmt))
                    };
                    if self.quote {
                        write!(writer, "{text_before}\"{time}\"{text_after}")
                    } else {
                        write!(writer, "{text_before}{time}{text_after}")
                    }?;
                    continue;
                }
            }
            // plus 1 for text_after
            let text = &line[text_start..(number_end + 1).min(line.len())];
            write!(writer, "{text}",)?;
        }
        Ok(())
    }

    const fn rfc_format<const LOCALIZE: bool>(sec_fmt: SecondsFormat) -> &'static str {
        match (LOCALIZE, sec_fmt) {
            (true, SecondsFormat::Secs) => "%Y-%m-%dT%H:%M:%S%Z",
            (false, SecondsFormat::Secs) => "%Y-%m-%dT%H:%M:%SZ",
            (true, SecondsFormat::Millis) => "%Y-%m-%dT%H:%M:%S%.3f%Z",
            (false, SecondsFormat::Millis) => "%Y-%m-%dT%H:%M:%S%.3fZ",
            (true, _) => "%Y-%m-%dT%H:%M:%S%.9f%Z",
            (false, _) => "%Y-%m-%dT%H:%M:%S%.9fZ",
        }
    }
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();

    let reformatter = Reformatter::new(args.threshold, args.local, args.quote);
    let mut output: Box<dyn Write> = if let Some(path) = args.output {
        Box::new(BufWriter::new(File::create(path)?))
    } else {
        Box::new(BufWriter::new(stdout().lock()))
    };

    if let Some(input_file) = args.input {
        for line in BufReader::new(File::open(input_file)?).lines() {
            reformatter.write(&mut output, &line?)?;
            output.write_all(b"\n")?;
        }
    } else if let Some((last, rest)) = args.strings.split_last() {
        for arg in rest {
            reformatter.write(&mut output, arg)?;
            output.write_all(b" ")?;
        }
        reformatter.write(&mut output, last)?;
        output.write_all(b"\n")?;
    } else {
        for line in stdin().lock().lines() {
            reformatter.write(&mut output, &line?)?;
            output.write_all(b"\n")?;
            output.flush()?;
        }
    }

    Ok(())
}
