from click import command, option
from brownie import accounts, network, web3


@command()
@option("--network-name", default="goerli")
def main(network_name):
    network.connect(network_name)
    account = accounts.load("ops")
    print(web3.eth.get_balance(account.address))
