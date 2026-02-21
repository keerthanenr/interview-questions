FROM docker.io/cloudflare/sandbox:0.7.5

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code

# Pre-create workspace directory
RUN mkdir -p /workspace/project

# Copy base React template into the image
COPY template/ /workspace/template/

# Pre-install template dependencies for fast startup
WORKDIR /workspace/template
RUN npm install --prefer-offline 2>/dev/null || true

WORKDIR /workspace

# Extend command timeout for long-running operations
ENV COMMAND_TIMEOUT_MS=600000

# Expose ports: Vite dev server + terminal
EXPOSE 5173
EXPOSE 3000
