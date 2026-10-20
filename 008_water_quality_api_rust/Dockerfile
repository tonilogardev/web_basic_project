FROM rust:bookworm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal-dev \
    clang \
    pkg-config \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Cargo.toml ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal32 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/water_quality_api_rust /usr/local/bin/water_quality_api

RUN mkdir -p /tmp/water_api_rust_public

EXPOSE 8000

ENV RUST_LOG=info
CMD ["/usr/local/bin/water_quality_api"]
