# Multi-stage static Ledger builder for Linux
FROM alpine:3.20 AS builder

RUN apk add --no-cache \
    cmake \
    make \
    g++ \
    git \
    boost-dev \
    boost-static \
    gmp-dev \
    mpfr-dev \
    bzip2-static \
    icu-static \
    xz-static \
    zlib-static \
    zstd-static \
    sed

WORKDIR /build
# Pin to same commit as packaging/ledger/ledger.nix (v3.3.2 with boost 1.85 compatibility)
RUN git clone https://github.com/ledger/ledger.git . && \
    git checkout 4355c4faf157d5ef47b126286aa501742732708d

RUN cmake -B build \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DCMAKE_FIND_LIBRARY_SUFFIXES=".a" \
    -DCMAKE_EXE_LINKER_FLAGS="-static" \
    -DBUILD_DOCS=OFF \
    -DUSE_PYTHON=OFF \
    -DUSE_GPGME=OFF \
    -DBUILD_LIBRARY=OFF \
    -DBoost_USE_STATIC_LIBS=ON \
    -DMPFR_LIB=/usr/lib/libmpfr.a \
    -DGMP_LIB=/usr/lib/libgmp.a

RUN cmake --build build -j$(nproc) && cmake --install build && strip /usr/local/bin/ledger

FROM scratch
COPY --from=builder /usr/local/bin/ledger /ledger
ENTRYPOINT ["/ledger"]
