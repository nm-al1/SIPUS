@echo off
echo Starting FigCraft with loopback control port 47801...
start "" "C:\Program Files\ArtCraft\FigCraft\figcraft.exe" --control 47801 "%~dp0design\Sipus_base.figcraft"

