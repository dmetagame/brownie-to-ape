from ape import accounts
from ape.api import AccountAPI


def signer_from_env(private_key: str) -> AccountAPI:
    return accounts.load("migrated-account")  # TODO: import private_key with `ape accounts import migrated-account`


def submit(owner: AccountAPI, vault):
    return vault.harvest(sender=owner)
