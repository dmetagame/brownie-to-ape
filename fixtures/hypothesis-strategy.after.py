from hypothesis import given, strategies as st


@given(amount=st.integers(min_value=1, max_value=10**18), flag=st.booleans())
def test_fuzz_mint(token, accounts, amount, flag):
    token.mint(accounts[0], amount, sender=accounts[0])
    assert token.balanceOf(accounts[0]) >= amount
    assert isinstance(flag, bool)
