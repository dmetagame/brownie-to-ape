from ape import *
from ape import Contract, accounts, chain, networks, project


def main():
    deployer = accounts.test_accounts[0]
    print(f"network={networks.provider.network.name}")
    print(f"chain_id={chain.chain_id}")
    return deployer
