#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Read-only market data + virtual trades. This program has no order API calls."""
import argparse
import json
import os
import signal
import sqlite3
import threading
from pathlib import Path
from datetime import datetime, timezone
import ccxt

os.umask(0o077)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--once', action='store_true')
args = parser.parse_args()
directory = Path.home()/'.local/share/evolve-bootstrap/trading'
directory.mkdir(parents=True, exist_ok=True, mode=0o700)
db = sqlite3.connect(directory/'paper.sqlite')
db.execute('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, value TEXT NOT NULL)')
db.execute('CREATE TABLE IF NOT EXISTS fills (timestamp INTEGER, side TEXT, btc REAL, usd REAL, fee REAL, mode TEXT CHECK(mode="paper"))')
row = db.execute('SELECT value FROM state WHERE id=1').fetchone()
state = json.loads(row[0]) if row else {'mode':'paper', 'usd':100.0, 'btc':0.0, 'lastCandle':0}
if state.get('mode') != 'paper':
    raise SystemExit('This executable supports paper mode only')
# No key/secret fields are read or configured. Only public OHLCV is requested.
market = ccxt.kraken({'enableRateLimit':True, 'timeout':20000})
quit_event = threading.Event()
for sig in [signal.SIGINT, signal.SIGTERM]:
    signal.signal(sig, lambda *_: quit_event.set())
try:
    while not quit_event.is_set():
        try:
            candles = market.fetch_ohlcv('BTC/USD', timeframe='5m', limit=32)[:-1]
            if len(candles) < 20:
                raise RuntimeError('Not enough closed candles')
            candle = candles[-1]
            price = float(candle[4])
            fast = sum(float(c[4]) for c in candles[-5:])/5
            slow = sum(float(c[4]) for c in candles[-20:])/20
            side = None
            fee_rate = 0.004  # Assumed paper fee, not a fee quotation from Kraken.
            if int(candle[0]) > state['lastCandle']:
                if fast > slow and state['btc'] == 0:
                    spent = min(20.0, state['usd'])
                    fee = spent*fee_rate
                    state['btc'] = (spent-fee)/price
                    state['usd'] -= spent
                    side = 'virtual-buy'
                    db.execute('INSERT INTO fills VALUES(?,?,?,?,?,"paper")', (candle[0],side,state['btc'],spent,fee))
                elif fast < slow and state['btc'] > 0:
                    received = state['btc']*price
                    fee = received*fee_rate
                    db.execute('INSERT INTO fills VALUES(?,?,?,?,?,"paper")', (candle[0],'virtual-sell',state['btc'],received-fee,fee))
                    state['usd'] += received-fee
                    state['btc'] = 0
                    side = 'virtual-sell'
                state['lastCandle'] = int(candle[0])
            state['lastPrice'] = price
            state['virtualEquityUsd'] = state['usd']+state['btc']*price
            state['checkedAt'] = datetime.now(timezone.utc).isoformat()
            state['strategy'] = 'demonstration SMA5/SMA20 on closed 5-minute BTC/USD candles'
            db.execute('INSERT OR REPLACE INTO state VALUES(1,?)', (json.dumps(state),))
            db.commit()
            (directory/'status.json').write_text(json.dumps(state,indent=2)+'\n')
            print(json.dumps({'mode':'paper','market':'BTC/USD','lastPrice':price,'virtualEquityUsd':round(state['virtualEquityUsd'],4),'action':side or 'hold'}), flush=True)
        except Exception as error:
            print('Public market data unavailable: '+type(error).__name__, flush=True)
            if args.once:
                raise
        if args.once:
            break
        quit_event.wait(60)
finally:
    db.close()
