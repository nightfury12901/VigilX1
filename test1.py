from twilio.rest import Client

account_sid = "AC85f83a6d7f494b2b672b82938e4a3d05"
auth_token  = "94e85665b8c64125ce31b4f0fc65fe26"
from_number = "+18312986621"
to_number   = "+919911478899"

client = Client(account_sid, auth_token)

msg = client.messages.create(
    body="DRIVER DROWSY PLEASE CONTACT .",
    from_=from_number,
    to=to_number
)

print(f"Message sent! SID: {msg.sid}")
