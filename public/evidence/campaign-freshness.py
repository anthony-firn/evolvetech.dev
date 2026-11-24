"""Synthetic explanation of a missing-child repair. No production data or code.

Run: python3 examples/campaign-freshness.py
The production worker has persistent queues and provider-specific retry handling;
this small model only demonstrates the completeness gate and bounded priority.
"""
import json


def missing_children(campaign, mirror):
    return [child for child in campaign['children'] if child not in mirror]


def choose_batch(urgent, ordinary, limit=32, reserved=8):
    # Preserve ordinary progress when both queues have work. Fill spare slots.
    first = urgent[:min(reserved, limit)]
    regular = ordinary[:limit - len(first)]
    return first + regular + urgent[len(first):len(first) + limit - len(first) - len(regular)]


def demonstrate():
    campaign = {'id': 'synthetic-campaign', 'parent_changed': False, 'children': ['synthetic-child-a', 'synthetic-child-b']}
    mirror = {'synthetic-child-a'}
    before = missing_children(campaign, mirror)
    # Completeness is checked even when the parent has not changed.
    urgent = ['repair:' + child for child in before]
    ordinary = ['ordinary:' + str(i) for i in range(40)]
    batch = choose_batch(urgent, ordinary)
    assert before == ['synthetic-child-b']
    assert not campaign['parent_changed']
    assert batch[0] == 'repair:synthetic-child-b' and len(batch) == 32
    assert len([job for job in choose_batch(list(range(50)), ordinary) if isinstance(job, int)]) == 8
    assert choose_batch([], ordinary) == ordinary[:32]
    assert choose_batch(list(range(40)), []) == list(range(32))
    # A synthetic provider response makes the child available. Never confirm early.
    assert missing_children(campaign, mirror)
    mirror.add('synthetic-child-b')
    assert not missing_children(campaign, mirror)
    return {'data': 'synthetic', 'parentChanged': False, 'before': {'missingChildren': before, 'confirmationAllowed': False},
            'repairScheduled': urgent, 'batch': {'urgent': 1, 'ordinary': 31},
            'afterProviderResponse': {'missingChildren': [], 'confirmationAllowed': True},
            'limits': 'In-memory explanation, not the private worker or a production benchmark.'}


if __name__ == '__main__':
    print(json.dumps(demonstrate(), indent=2))
