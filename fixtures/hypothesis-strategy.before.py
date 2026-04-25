from brownie.test import given, strategy


@given(amount=strategy("uint256", min_value=1, max_value=10**18), flag=strategy("bool"))
def test_fuzz_mint(token, accounts, amount, flag):
    token.mint(accounts[0], amount, {"from": accounts[0]})
    assert token.balanceOf(accounts[0]) >= amount
    assert isinstance(flag, bool)
