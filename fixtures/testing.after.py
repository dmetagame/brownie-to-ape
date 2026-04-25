import ape
import pytest


@pytest.fixture
def owner(accounts):
    return accounts[0]


@pytest.fixture
def token(project, owner):
    return project.Token.deploy("Demo", "DME", 18, sender=owner)


def test_owner(token, owner):
    assert token.owner() == owner


def test_only_owner(token, accounts):
    with ape.reverts("Ownable: caller is not the owner"):
        token.mint(accounts[1], 1, sender=accounts[1])
