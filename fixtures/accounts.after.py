import os

from ape import accounts
from ape_accounts import import_account_from_private_key


def get_accounts():
    deployer = accounts.test_accounts[0]
    treasury = import_account_from_private_key(
        "treasury",
        os.environ["APE_ACCOUNTS_PASSPHRASE"],
        os.environ["PRIVATE_KEY"],
    )
    cold_storage = accounts.load("cold-storage")
    return deployer, treasury, cold_storage
