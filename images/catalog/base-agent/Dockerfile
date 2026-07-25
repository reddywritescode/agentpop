FROM agentpop/devbox:local

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       nodejs \
       npm \
       python3 \
       python3-pip \
       python3-venv \
       sqlite3 \
    && rm -rf /var/lib/apt/lists/*
