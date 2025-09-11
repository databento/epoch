use assert_cmd::Command;
use predicates::{
    boolean::PredicateBooleanExt,
    ord::eq,
    str::{ends_with, is_empty},
};
use rstest::*;

fn cmd() -> Command {
    Command::cargo_bin("epoch").unwrap()
}

#[rstest]
#[case::start(
    "1709152989456 test 3 b 12768987 c",
    "2024-02-28T20:43:09.456Z test 3 b 12768987 c"
)]
#[case::end(
    "pglbx-326[MDP30][8292](HandleTradeSummary:pcme.cpp:697):WARN:5: 2 extra order entries at event time 1705882498431161301",
    "pglbx-326[MDP30][8292](HandleTradeSummary:pcme.cpp:697):WARN:5: 2 extra order entries at event time 2024-01-22T00:14:58.431161301Z"
)]
#[case::unicode(
    "Deserializationµs=547.261 1709152989",
    "Deserializationµs=547.261 2024-02-28T20:43:09Z"
)]
fn test_replacement(#[case] stdin: &str, #[case] stdout: &str) {
    cmd()
        .write_stdin(format!("{stdin}\n"))
        .assert()
        .success()
        .stdout(eq(format!("{stdout}\n")))
        .stderr(is_empty());
}

#[rstest]
fn test_localize() {
    cmd()
        .write_stdin("1712070452000000000")
        .arg("--local")
        .assert()
        .success()
        .stdout(ends_with("Z").not().and(is_empty().not()))
        .stderr(is_empty());
}
