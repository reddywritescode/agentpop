class Agentpop < Formula
  desc "CLI for AgentPop cloud sandboxes and reusable agent images"
  homepage "https://agentpop.cloud"
  version "0.1.1"
  license "Apache-2.0"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/reddywritescode/agentpop-cli/releases/download/v0.1.1/agentpop_0.1.1_darwin_arm64.tar.gz"
      sha256 "1831423b40c2e8b1aae1b2fb7adeb6911ef020008ec439d6d6972822bd43750f"
    else
      url "https://github.com/reddywritescode/agentpop-cli/releases/download/v0.1.1/agentpop_0.1.1_darwin_amd64.tar.gz"
      sha256 "909dcc37b1447b24e75128956c04650582c8bc4314e6c6c118dd69931a34dacf"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/reddywritescode/agentpop-cli/releases/download/v0.1.1/agentpop_0.1.1_linux_arm64.tar.gz"
      sha256 "e70ecfe3d18281d7644fa8035471c1b3f87da3bd9788e8c3426c06596c40a077"
    else
      url "https://github.com/reddywritescode/agentpop-cli/releases/download/v0.1.1/agentpop_0.1.1_linux_amd64.tar.gz"
      sha256 "723f8eb9e2f7522b98a3143ede2cd9a50a315066ead6a5ed811546d59c145c7c"
    end
  end

  def install
    bin.install "agentpop"
  end

  test do
    assert_match "agentpop", shell_output("#{bin}/agentpop version")
  end
end
