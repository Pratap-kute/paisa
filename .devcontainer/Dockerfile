FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Configure non-root user and install strictly necessary dev packages & libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo \
    build-essential \
    pkg-config \
    libsqlite3-dev \
    sqlite3 \
    curl \
    unzip \
    git \
    ca-certificates \
    tzdata \
    ledger \
    python3 \
    python3-pip \
    python3-venv \
    # Minimal GUI libraries required by Playwright Chromium
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2t64 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2t64 \
    && usermod -l vscode ubuntu \
    && groupmod -n vscode ubuntu \
    && usermod -d /home/vscode -m vscode \
    && echo "vscode ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/vscode \
    && chmod 0440 /etc/sudoers.d/vscode \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install Go 1.26
ARG GO_VERSION=1.26.0
RUN curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" | tar -xz -C /usr/local

# Install golangci-lint
ARG GOLANGCI_LINT_VERSION=2.14.0
RUN curl -sSL "https://github.com/golangci/golangci-lint/releases/download/v${GOLANGCI_LINT_VERSION}/golangci-lint-${GOLANGCI_LINT_VERSION}-linux-amd64.tar.gz" | \
    tar -xz -C /usr/local/bin --strip-components=1 "golangci-lint-${GOLANGCI_LINT_VERSION}-linux-amd64/golangci-lint"

# Install Deno
ENV DENO_INSTALL="/usr/local"
RUN curl -fsSL https://deno.land/install.sh | sh

# Install pinned hledger 1.52.4 static binary
RUN curl -sSL https://github.com/hledgerorg/hledger/releases/download/1.52.4/hledger-linux-x64.tar.gz | tar -xz -C /usr/local/bin

# Install Python packages (beancount, mkdocs-material)
RUN pip install --no-cache-dir --break-system-packages beancount mkdocs-material

# Environment setup
ENV GOPATH="/home/vscode/go"
ENV PATH="/usr/local/go/bin:/home/vscode/go/bin:${PATH}"
ENV CGO_ENABLED=1

USER vscode
WORKDIR /workspace
