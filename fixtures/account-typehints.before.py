from brownie.network.account import LocalAccount
from brownie import Account


def signer_from_env(private_key: str) -> LocalAccount:
    return Account.from_key(private_key)


def submit(owner: LocalAccount, vault):
    return vault.harvest({"from": owner})
