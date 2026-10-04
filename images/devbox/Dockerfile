FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        git \
        iproute2 \
        jq \
        openssh-server \
        procps \
        python3 \
        python3-pip \
        ripgrep \
        sudo \
        tini \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /run/sshd /root/.ssh /workspace \
    && chmod 0700 /root/.ssh \
    && printf '%s\n' \
        'PermitRootLogin prohibit-password' \
        'PasswordAuthentication no' \
        'KbdInteractiveAuthentication no' \
        'PubkeyAuthentication yes' \
        'AllowTcpForwarding yes' \
        'GatewayPorts no' \
        'X11Forwarding no' \
        'PrintMotd no' \
        > /etc/ssh/sshd_config.d/agentpop.conf

COPY entrypoint.sh /usr/local/bin/agentpop-entrypoint
RUN chmod 0755 /usr/local/bin/agentpop-entrypoint

WORKDIR /workspace
EXPOSE 22

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/agentpop-entrypoint"]
