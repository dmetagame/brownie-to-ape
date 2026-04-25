from ape import chain
from brownie import web3

amount = web3.toWei(1, "ether")
balance = chain.get_balance(account)
