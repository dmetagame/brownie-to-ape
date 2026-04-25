import brownie
import pytest
from brownie import Token, accounts


@pytest.fixture
def token():
    owner = accounts[0]
    return Token.deploy("Demo", "DME", 18, {"from": owner})


def test_owner(token):
    assert token.owner() == accounts[0]


def test_only_owner(token):
    with brownie.reverts("Ownable: caller is not the owner"):
        token.mint(accounts[1], 1, {"from": accounts[1]})
