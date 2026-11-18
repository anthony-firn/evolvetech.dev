#!/bin/sh
systemctl --user stop evolve-bootstrap-watch.service evolve-bootstrap-settlement.service
systemctl --user stop evolve-bootstrap-cpu.service evolve-bootstrap-gpu.service
