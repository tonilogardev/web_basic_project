output "vps_ipv4" {
  description = "Dirección IP pública primaria (IPv4)"
  value       = hcloud_primary_ip.v4.ip_address
}

output "vps_ipv6" {
  description = "Dirección IP pública primaria (IPv6)"
  value       = hcloud_primary_ip.v6.ip_address
}