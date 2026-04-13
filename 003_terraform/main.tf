# --- 1. CLAVES SSH ---
resource "hcloud_ssh_key" "main_key" {
  name       = var.ssh_key_name
  public_key = file(var.ssh_public_key_path)
}

# --- 2. RED PRIVADA (ESCALABILIDAD MICROSERVICIOS) ---
resource "hcloud_network" "private_net" {
  name     = "red-interna-${var.server_name}"
  ip_range = "10.0.0.0/16"
}

resource "hcloud_network_subnet" "private_subnet" {
  network_id   = hcloud_network.private_net.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.0.0/24"
}

# --- 3. IPS PÚBLICAS FRONTALES ---
resource "hcloud_primary_ip" "v4" {
  name          = "ip-v4-${var.server_name}"
  type          = "ipv4"
  location      = var.location
  assignee_type = "server"
  auto_delete   = false
}

resource "hcloud_primary_ip" "v6" {
  name          = "ip-v6-${var.server_name}"
  type          = "ipv6"
  location      = var.location
  assignee_type = "server"
  auto_delete   = false
}

# --- 4. ENGINE: SERVIDOR NÚCLEO ---
resource "hcloud_server" "vps" {
  name        = var.server_name
  image       = var.image
  server_type = var.server_type
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.main_key.id]

  # Exposición a Internet
  public_net {
    ipv4 = hcloud_primary_ip.v4.id
    ipv6 = hcloud_primary_ip.v6.id
  }

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    # Inyección de Docker Moderno
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    mkdir -p /opt/app
  EOF

  # Esta dependencia obliga a la red a crearse antes de levantar la máquina
  depends_on = [
    hcloud_network_subnet.private_subnet
  ]
}

# Conexión Segura entre el Servidor y la Subred Privada ("Subnet ID" compliant v1.60.0)
resource "hcloud_server_network" "srvnetwork" {
  server_id  = hcloud_server.vps.id
  subnet_id  = hcloud_network_subnet.private_subnet.id
  alias_ips  = []
}