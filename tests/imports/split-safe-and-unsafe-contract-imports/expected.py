from ape import accounts, config, networks, project
from brownie import MockV3Aggregator  # TODO(brownie-to-ape): migrate this unsupported Brownie import manually.


def deploy(account):
    mock = MockV3Aggregator[-1]
    fund_me = FundMe.deploy(mock.address, {"from": account})
    MockV3Aggregator.publish_source(mock)
    return fund_me
