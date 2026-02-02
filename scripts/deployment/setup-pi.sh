#!/bin/bash

# =============================================================================
# Raspberry Pi Initial Setup Script
# Prepares a fresh Raspberry Pi for BoxerConnect deployment
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# System Updates
# =============================================================================

log_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y
log_success "System updated!"

# =============================================================================
# Install Docker
# =============================================================================

log_info "Installing Docker..."

# Check if Docker is already installed
if command -v docker >/dev/null 2>&1; then
    log_warning "Docker is already installed"
else
    # Install Docker using convenience script
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh

    # Add current user to docker group
    sudo usermod -aG docker $USER

    log_success "Docker installed successfully!"
    log_warning "You may need to log out and back in for group changes to take effect"
fi

# =============================================================================
# Install Docker Compose
# =============================================================================

log_info "Installing Docker Compose..."

# Check if Docker Compose is already installed
if docker compose version >/dev/null 2>&1; then
    log_warning "Docker Compose is already installed"
else
    # Install Docker Compose plugin
    sudo apt install -y docker-compose-plugin
    log_success "Docker Compose installed successfully!"
fi

# =============================================================================
# Install Additional Tools
# =============================================================================

log_info "Installing additional tools..."

sudo apt install -y \
    git \
    curl \
    wget \
    htop \
    vim \
    ufw \
    fail2ban \
    unattended-upgrades

log_success "Additional tools installed!"

# =============================================================================
# Security Hardening
# =============================================================================

log_info "Configuring security settings..."

# Configure UFW firewall
log_info "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable
log_success "Firewall configured!"

# Configure fail2ban
log_info "Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
log_success "Fail2ban configured!"

# Configure automatic security updates
log_info "Enabling automatic security updates..."
echo 'APT::Periodic::Update-Package-Lists "1";' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades
echo 'APT::Periodic::Unattended-Upgrade "1";' | sudo tee -a /etc/apt/apt.conf.d/20auto-upgrades
log_success "Automatic security updates enabled!"

# =============================================================================
# SSH Hardening (Optional)
# =============================================================================

log_warning "SSH hardening recommendations:"
echo "  1. Disable password authentication (use SSH keys only)"
echo "  2. Disable root login"
echo "  3. Change default SSH port"
echo ""
echo "To apply these changes, edit /etc/ssh/sshd_config:"
echo "  - Set: PasswordAuthentication no"
echo "  - Set: PermitRootLogin no"
echo "  - Set: Port 2222 (or another port)"
echo ""
echo "Then restart SSH: sudo systemctl restart sshd"

# =============================================================================
# Create Project Directory
# =============================================================================

log_info "Creating project directory..."
PROJECT_DIR="/home/$USER/boxerconnect"
mkdir -p "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR/backups"
log_success "Project directory created at $PROJECT_DIR"

# =============================================================================
# System Optimization for Raspberry Pi
# =============================================================================

log_info "Optimizing system for Docker..."

# Increase swap size (useful for building images)
if [ -f /etc/dphys-swapfile ]; then
    log_info "Increasing swap size..."
    sudo sed -i 's/CONF_SWAPSIZE=100/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
    sudo systemctl restart dphys-swapfile
    log_success "Swap size increased to 2GB"
fi

# Enable cgroup memory
if ! grep -q "cgroup_enable=memory" /boot/cmdline.txt; then
    log_info "Enabling cgroup memory..."
    sudo sed -i '$ s/$/ cgroup_enable=memory cgroup_memory=1/' /boot/cmdline.txt
    log_warning "Cgroup memory enabled - reboot required!"
fi

# =============================================================================
# Generate Secrets
# =============================================================================

log_info "Generating secure secrets..."

echo ""
echo "========================================"
echo "Generated Secrets (SAVE THESE SECURELY!)"
echo "========================================"
echo ""
echo "JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo ""
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo ""
echo "DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')"
echo ""
echo "REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')"
echo ""
echo "========================================"
echo ""

# =============================================================================
# Setup Complete
# =============================================================================

echo ""
echo "========================================"
echo -e "${GREEN}Raspberry Pi Setup Complete!${NC}"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Copy generated secrets to .env.production"
echo "  2. Configure your domain in .env.production"
echo "  3. Clone the BoxerConnect repository to $PROJECT_DIR"
echo "  4. Run the deployment script: ./scripts/deployment/deploy.sh"
echo ""
echo "Important:"
echo "  - If cgroup memory was enabled, reboot the system now"
echo "  - Configure SSH hardening as recommended above"
echo "  - Point your domain DNS to this Raspberry Pi's IP address"
echo ""
echo "========================================"

exit 0
