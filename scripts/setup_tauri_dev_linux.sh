#!/bin/bash

printf "This Script will setup the tauri dev environment\n"

# check if the user is running as root
if [ "$EUID" -ne 0 ]; then
  printf "Please run as root\n"
  exit 1
fi

# Which distro are we on?
printf "Detecting Distro\n"

# run this command: cat /etc/*-release | uniq -u and grep for the ID field and pipe into a variable

cat /etc/*-release | uniq -u | grep -i "ID" | cut -d "=" -f 2 | tr -d '"' | tr -d '\n' >distro.txt

# read the variable into a variable
distro=$(cat distro.txt)
# split distro into an array
IFS=' ' read -r -a distro <<<"$distro"
# get the first element of the array
distro=${distro[0]}
# convert distro to lowercase
distro=${distro,,}
# remove the file
rm distro.txt

# check if the distro is Ubuntu or arch or fedora or gentoo or openSUSE or NixOS or GNU GUIX or void
if [ "$distro" == "ubuntu" ] || [ "$distro" == "arch" ] || [ "$distro" == "fedora" ] || [ "$distro" == "gentoo" ] || [ "$distro" == "opensuse" ] || [ "$distro" == "void" ]; then
  printf "Distro is $distro\n"
else
  printf "Distro is not supported\n"
  printf "NixOS and GNU GUIX are not supported by this script, but are supported by tauri - please see the tauri docs for more information.\n"
  exit 1
fi

# Install Linux Development Dependencies
# run specific commands based on the distro
case $distro in
"ubuntu")
  printf "Installing Ubuntu Development Dependencies\n"
  sudo apt update
  sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
  ;;
"arch")
  printf "Installing Arch Development Dependencies\n"
  sudo pacman -Syu
  sudo pacman -S --needed webkit2gtk base-devel curl wget openssl appmenu-gtk-module gtk3 libappindicator-gtk3 librsvg libvips
  ;;
"fedora")
  printf "Installing Fedora Development Dependencies\n"
  sudo dnf check-update
  sudo dnf install webkit2gtk4.0-devel openssl-devel curl wget libappindicator-gtk3 librsvg2-devel
  sudo dnf group install "C Development Tools and Libraries"
  ;;
"gentoo")
  printf "Installing Gentoo Development Dependencies\n"
  sudo emerge --ask net-libs/webkit-gtk:4 dev-libs/libappindicator net-misc/curl net-misc/wget
  ;;
"opensuse")
  printf "Installing openSUSE Development Dependencies\n"
  sudo zypper up
  sudo zypper in webkit2gtk3-soup2-devel libopenssl-devel curl wget libappindicator3-1 librsvg-devel
  sudo zypper in -t pattern devel_basis
  ;;
"void")
  printf "Installing Void Development Dependencies\n"
  sudo xbps-install -Syu
  sudo xbps-install -S webkit2gtk curl wget openssl gtk+3 libappindicator librsvg gcc pkg-config
  ;;
esac
# Install Rust
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
# All done!
printf "All done!\n"
