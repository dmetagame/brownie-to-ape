from brownie import chain, network, web3


def main():
    active = network.show_active()
    print(f"{active}:{web3.eth.chain_id}:{chain.height}")
    if active != "mainnet":
        network.connect("mainnet")
    return active
