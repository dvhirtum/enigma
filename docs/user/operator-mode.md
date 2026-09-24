# Operator mode

[Back to the contents](README.md)

Operator mode walks through the Navy indicator procedure while you work the machine. Open it with the message pad button at the top right. The panel lists the steps and marks the current one. Type and turn the rotors in the [top-down view](machine.md).

Keys other than the expected one are rejected. **Cancel** stops the procedure at any time.

## Sending

Sending needs an applied daily key (see [Key sheets](key-sheets.md)). The panel warns when the setup differs from the key.

1. Click **Send a message**.
2. **Choose the groups.** Pick a Schlüsselkenngruppe from your network's columns and a Verfahrenkenngruppe from the Verfahrenkenngruppen columns, or click **Random**. Enter two filler letters and click **Encrypt indicator**. The panel shows the bigram swaps from the Tauschtafel and the two indicator groups.
3. **Set the Grundstellung.** Turn the rotors until the windows show it.
4. **Type the Verfahrenkenngruppe.** The lamps give the Spruchschlüssel (message key).
5. **Set the Spruchschlüssel.** On the M4 the Greek rotor keeps its Grundstellung letter.
6. **Type the message.** The message pad shows the cipher text in groups of 4. Type X until the last group is full, then click **Finish**.
7. Click **Copy** to copy the radio message.

A radio message looks like this:

```
1840 = 24 = QWER TZUI ABCD EFGH QWER TZUI
```

The time of origin and the letter count come first. The two indicator groups stand at the start and the end.

## Receiving

1. Paste the message under **Received message**. The date is filled in from the applied key, or today.
2. Click **Find key**. The panel lists the key sheet days whose network the Schlüsselkenngruppe belongs to. Click **Receive with this key**. If the right key is already applied, click **Receive with applied key** instead.
3. Set the Grundstellung, type the Verfahrenkenngruppe and set the Spruchschlüssel, as when sending.
4. Type the cipher text. The next letter is highlighted, and the message pad shows the plaintext.

The panel warns when the letter count differs, when the Schlüsselkenngruppe does not belong to the network, or when the Verfahrenkenngruppe is not one.

Click **New message** to start again.
