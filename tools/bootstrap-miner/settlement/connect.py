#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Collect setup secrets in a local terminal without echoing or logging them."""
import getpass
import json
import os
import subprocess
import tempfile
from pathlib import Path

os.umask(0o077)
directory=Path.home()/'.local/share/evolve-bootstrap/settlement'
directory.mkdir(parents=True,exist_ok=True,mode=0o700)
print('Nano → ALGO donation wallet setup\n')
print('The miner continues its existing ALGO route until these checks succeed.')
print('1. Sign in at https://nanswap.com/API and get a free API key.')
print('2. Sign in at https://unmineable.com/api, create an alias, then a read/write API key.')
print('Enter keys only here. Input is hidden. A blank answer leaves setup unactivated.\n')
fields=[('nanswapKey','Nanswap API key'),('unmineableKey','unMineable public API key (upk_...)'),('unmineableSecret','unMineable API secret')]
values={}
for name,label in fields:
    value=getpass.getpass(label+': ').strip()
    if not value:
        print('Setup remains unactivated. The existing ALGO miner configuration is preserved.')
        input('Press Enter to close. ')
        raise SystemExit(0)
    if len(value)<8 or len(value)>512 or any(c.isspace() for c in value):
        raise SystemExit('Invalid key format; no activation performed.')
    values[name]=value
with tempfile.NamedTemporaryFile(mode='w',dir=directory,prefix='.credentials-',delete=False) as output:
    temporary=Path(output.name)
    output.write(json.dumps(values,indent=2)+'\n')
    output.flush();os.fsync(output.fileno())
temporary.replace(directory/'credentials.json')
script=Path(__file__).resolve().with_name('cli.mjs')
result=subprocess.run(['/home/anthony/.nvm/versions/node/v22.23.4/bin/node',str(script),'activate'],check=False)
if result.returncode:
    print('\nActivation did not complete. Check the account alias, API scope and the reported error. Existing ALGO mining is retained or restored after a host configuration failure.')
else:
    print('\nNano mining and the one-time donation wallet conversion are active.')
print('Recovery seed and credentials are stored only in the private local settlement directory.')
input('Press Enter to close. ')
