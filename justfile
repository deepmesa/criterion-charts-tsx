export RUST_BACKTRACE := "1"

all: build test doc

build:
    cargo build --all

test:
    cargo test --all -- --nocapture

doc:
    cargo doc --no-deps --all

clean:
    cargo clean

run:
    cargo run
