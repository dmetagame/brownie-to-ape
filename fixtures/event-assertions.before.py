from brownie import accounts


def test_transfer_event(token):
    owner = accounts[0]
    receiver = accounts[1]
    receipt = token.transfer(receiver, 100, {"from": owner})
    assert "Transfer" in receipt.events
    assert receipt.events["Transfer"][0]["from"] == owner
    assert receipt.events["Transfer"][0]["to"] == receiver
