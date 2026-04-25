from brownie import (
    FundMe,
    MockV3Aggregator,
    accounts,
    config,
    network,
)


def deploy(account):
    mock = MockV3Aggregator[-1]
    fund_me = FundMe.deploy(mock.address, {"from": account})
    MockV3Aggregator.publish_source(mock)
    return fund_me
