from ape import project


def deploy(account, gas_lane):
    return project.VRFConsumerV2.deploy(
        gas_lane,  # Also known as keyhash
        sender=account,
    )
