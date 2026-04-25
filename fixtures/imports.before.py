from brownie import *
from brownie import accounts, network, web3, Contract, Token


def main():
    deployer = accounts[0]
    print(f"network={network.show_active()}")
    print(f"chain_id={web3.eth.chain_id}")
    return deployer
