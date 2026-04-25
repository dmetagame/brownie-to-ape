import os

from brownie import accounts


def get_accounts():
    deployer = accounts[0]
    treasury = accounts.add(os.environ["PRIVATE_KEY"])
    cold_storage = accounts.load("cold-storage")
    return deployer, treasury, cold_storage
