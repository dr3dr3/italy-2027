# Ubuntu Noble (24.04 LTS) — lower CVE surface than Debian Bookworm
FROM ubuntu:24.04

LABEL maintainer="André Dreyer"

ARG DEBIAN_FRONTEND=noninteractive

# Base dependencies
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    gnupg \
    git \
    unzip \
    less \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22 via NodeSource apt repo (avoids piping remote script into bash)
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
       | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
       > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm via corepack (Node 22 ships a recent enough npm)
RUN corepack enable \
    && corepack prepare pnpm@latest --activate

# GitHub CLI
RUN mkdir -p -m 755 /etc/apt/keyrings \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
       | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

RUN echo "Verifying installations..." \
    && node --version \
    && npm --version \
    && pnpm --version \
    && gh --version

# Non-root user
ARG USERNAME=dev
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN userdel -r ubuntu 2>/dev/null || true \
    && groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME -s /bin/bash \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

USER $USERNAME
WORKDIR /home/$USERNAME

RUN git config --global user.name "André Dreyer" \
    && git config --global user.email "github@andredreyer.com"

# Claude Code CLI (official native installer)
RUN curl -fsSL https://claude.ai/install.sh | bash

ENV PATH="/home/${USERNAME}/.local/bin:$PATH"

CMD ["/bin/bash"]
