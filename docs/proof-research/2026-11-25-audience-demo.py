"""Offline research experiment: signed tokens can still have the wrong audience.

Needs PyJWT and cryptography. Generates an ephemeral RSA key; never prints tokens or keys.
This is a claims-validation experiment, not an MCP server or complete production authentication system.
"""
import json
import time
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa


def main():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public = key.public_key()
    issuer = 'https://issuer.example'
    resource = 'https://tools.example/mcp'
    now = int(time.time())
    base = {'iss': issuer, 'sub': 'synthetic-user', 'aud': resource, 'exp': now + 300, 'scope': 'tools:read'}

    def encode(**updates):
        return jwt.encode({**base, **updates}, key, algorithm='RS256')

    def verify(token):
        return jwt.decode(token, public, algorithms=['RS256'], issuer=issuer, audience=resource,
                          options={'require': ['iss', 'sub', 'aud', 'exp']})

    wrong = encode(aud='https://other-service.example/api')
    # Deliberately broken verifier for the before/after demonstration only.
    assert jwt.decode(wrong, public, algorithms=['RS256'], issuer=issuer,
                      options={'verify_aud': False})['sub'] == 'synthetic-user'
    outcomes = [{'case': 'signature and issuer only, wrong audience', 'accepted': True, 'policy': 'deliberately broken'}]
    valid = encode()
    claims = verify(valid)
    assert claims['sub'] == 'synthetic-user'
    outcomes.append({'case': 'correct audience and valid signature', 'accepted': True})
    no_aud = dict(base); no_aud.pop('aud')
    pieces = valid.split('.')
    pieces[-1] = ('A' if pieces[-1][0] != 'A' else 'B') + pieces[-1][1:]
    cases = [
        ('wrong audience', wrong, jwt.InvalidAudienceError),
        ('missing audience', jwt.encode(no_aud, key, algorithm='RS256'), jwt.MissingRequiredClaimError),
        ('expired token', encode(exp=now - 60), jwt.ExpiredSignatureError),
        ('wrong issuer', encode(iss='https://another-issuer.example'), jwt.InvalidIssuerError),
        ('altered signature', '.'.join(pieces), jwt.InvalidSignatureError),
    ]
    for label, token, expected in cases:
        try:
            verify(token)
        except expected as error:
            outcomes.append({'case': label, 'accepted': False, 'reason': type(error).__name__})
        else:
            raise AssertionError(f'{label} was incorrectly accepted')
    claims = verify(encode(scope='other-tools:read'))
    assert 'tools:read' not in set(claims['scope'].split())
    outcomes.append({'case': 'lookalike scope, authenticated token', 'authorized': False})
    print(json.dumps({'library': f'PyJWT {jwt.__version__}', 'networkRequests': 0, 'outcomes': outcomes}, indent=2))


if __name__ == '__main__':
    main()
