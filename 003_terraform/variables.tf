variable "hcloud_token" {
  type      = string
  sensitive = true
}

variable "ssh_key_name" {
  type = string
}

variable "ssh_public_key_path" {
  type = string
}

variable "server_name" {
  type = string
}

variable "server_type" {
  type = string
}

variable "location" {
  type = string
}

variable "image" {
  type = string
}