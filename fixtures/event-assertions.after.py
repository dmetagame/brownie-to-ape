def test_transfer_event(token, accounts):
    owner = accounts[0]
    receiver = accounts[1]
    receipt = token.transfer(receiver, 100, sender=owner)
    transfers = [log for log in receipt.events if log.event_name == "Transfer"]
    assert transfers
    assert transfers[0].event_arguments["from"] == owner
    assert transfers[0].event_arguments["to"] == receiver
