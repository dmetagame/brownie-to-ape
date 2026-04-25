import click
from ape import accounts
from ape.cli import network_option


@click.command()
@network_option()
def cli(provider):
    account = accounts.load("ops")
    print(account.balance)
