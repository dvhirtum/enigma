using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>A historical message bundled with the Bombe, with its date when known.</summary>
public sealed record Intercept(string Id, DateOnly? Date, MessageSource Source);

/// <summary>The historical messages bundled with the Bombe, each with its published key and plain text.</summary>
public static class Intercepts
{
    private const string ScharnhorstGroups = """
        UTKZ RBSB YKAE NZAP
        MSCH ZBFO CUVM RMDP
        YCOF HADZ IZME FXTH
        FLOL PZLF GGBO TGOX
        GRET DWTJ IQHL MXVJ
        WKZU ASTR UTKZ RBSB
        """;

    private const string BarbarossaHeader = """
        Befördert am: 07.07.1941 1925 Uhr
        Funkspruch Nr.: 20   Von/An: f8v/bz2
        Absendende Stelle: SS-T Div Kdr   An: LVI A.K.

        """;

    // The preamble as on the Red Form: time of origin and count, without separators.
    private const string ScharnhorstTranscript = "1925 21\n" + ScharnhorstGroups;

    private static readonly RadioMessage Scharnhorst = RadioMessage.Parse(ScharnhorstTranscript);

    private const string BarbarossaSource =
        "Key recovered by Geoff Sullivan and Frode Weierud; message as given in Dirk Rijmenants' Enigma Sim manual.";

    private const string BarbarossaPlugs = "AV BS CG DL FU HZ IN KM OW RX";

    public static IReadOnlyList<Intercept> All { get; } =
    [
        new(
            "scharnhorst-1943",
            new DateOnly(1943, 12, 26),
            new MessageSource(
                SourceKind.Intercept,
                "Scharnhorst, 26 December 1943",
                "The battleship Scharnhorst's last signal, sent at 1925 during the Battle of the North Cape and taken down "
                + "on HMS Duke of York. She reported steering for the Tanafjord. Navy key Heimisch (Dolphin), three-rotor M3.",
                ScharnhorstTranscript,
                Scharnhorst,
                MessageSource.Letters(Scharnhorst.CipherText),
                Crib.Parse("STEUEREJTANAFJORD"),
                new Solution(
                    ReflectorType.B,
                    WheelOrder.Parse("III VI VIII"),
                    Rings("01 08 13"),
                    Plugs("AN EZ HK IJ LR MQ OT PV SW UX"),
                    RotorPositions.Parse("UZV"),
                    "STEUEREJTANAFJORDJANSTANDORTQUAAACCCVIERNEUNNEUNZWOFAHRTZWONULSMXXSCHARNHORSTHCO",
                    "Red Form from HMS Duke of York, published by Frode Weierud (CryptoCellar). Key recovered by the M4 "
                    + "Project in 2008. The preamble gives 21 groups, but 24 were received."))),
        new(
            "barbarossa-1941-1",
            new DateOnly(1941, 7, 7),
            new MessageSource(
                SourceKind.Intercept,
                "Operation Barbarossa, 7 July 1941, part 1",
                "A situation report from the SS-Totenkopf division to LVI Army Corps on the northern front. Army Enigma I: "
                + "the first group (RFUGZ) is the Kenngruppe, sent in the clear, and the message key is sent encrypted at "
                + "the setting WXC.",
                BarbarossaHeader + """
                    fuer m7g 1840 - 2tl 1t 179 - WXC KCH -

                    RFUGZ EDPUD NRGYS ZRCXN
                    UYTPO MRMBO FKTBZ REZKM
                    LXLVE FGUEY SIOZV EQMIK
                    UBPMM YLKLT TDEIS MDICA
                    GYKUA CTCDO MOHWX MUUIA
                    UBSTS LRNBZ SZWNR FXWFY
                    SSXJZ VIJHI DISHP RKLKA
                    YUPAD TXQSP INQMA TLPIF
                    SVKDA SCTAC DPBOP VHJK
                    """,
                null,
                MessageSource.Letters(
                    "EDPUD NRGYS ZRCXN UYTPO MRMBO FKTBZ REZKM LXLVE FGUEY SIOZV EQMIK UBPMM YLKLT TDEIS MDICA GYKUA "
                    + "CTCDO MOHWX MUUIA UBSTS LRNBZ SZWNR FXWFY SSXJZ VIJHI DISHP RKLKA YUPAD TXQSP INQMA TLPIF SVKDA "
                    + "SCTAC DPBOP VHJK"),
                Crib.Parse("AUFKLXABTEILUNGXVONX"),
                new Solution(
                    ReflectorType.B,
                    WheelOrder.Parse("II IV V"),
                    Rings("02 21 12"),
                    Plugs(BarbarossaPlugs),
                    RotorPositions.Parse("BLA"),
                    "AUFKLXABTEILUNGXVONXKURTINOWAXKURTINOWAXNORDWESTLXSEBEZXSEBEZXUAFFLIEGERSTRASZERIQTUNGXDUBROWKIX"
                    + "DUBROWKIXOPOTSCHKAXOPOTSCHKAXUMXEINSAQTDREINULLXUHRANGETRETENXANGRIFFXINFXRGTX",
                    "Message key BLA, sent as KCH at WXC. " + BarbarossaSource))),
        new(
            "barbarossa-1941-2",
            new DateOnly(1941, 7, 7),
            new MessageSource(
                SourceKind.Intercept,
                "Operation Barbarossa, 7 July 1941, part 2",
                "The second part of the SS-Totenkopf situation report, sent with the same daily key as part 1 and its own "
                + "message key (at the setting CRS). The first group (FNJAU) is the Kenngruppe, sent in the clear.",
                BarbarossaHeader + """
                    2tl 155 - CRS YPJ -

                    FNJAU SFBWD NJUSE GQOBH
                    KRTAR EEZMW KPPRB XOHDR
                    OEQGB BGTQV PGVKB VVGBI
                    MHUSZ YDAJQ IROAX SSSNR
                    EHYGG RPISE ZBOVM QIEMM
                    ZCYSG QDGRE RVBIL EKXYQ
                    IRGIR QNRDN VRXCY YTNJR
                    """,
                null,
                MessageSource.Letters(
                    "SFBWD NJUSE GQOBH KRTAR EEZMW KPPRB XOHDR OEQGB BGTQV PGVKB VVGBI MHUSZ YDAJQ IROAX SSSNR EHYGG "
                    + "RPISE ZBOVM QIEMM ZCYSG QDGRE RVBIL EKXYQ IRGIR QNRDN VRXCY YTNJR"),
                Crib.Parse("AUFFLIEGERSTRASZE"),
                new Solution(
                    ReflectorType.B,
                    WheelOrder.Parse("II IV V"),
                    Rings("02 21 12"),
                    Plugs(BarbarossaPlugs),
                    RotorPositions.Parse("LSD"),
                    "DREIGEHTLANGSAMABERSIQERVORWAERTSXEINSSIEBENNULLSEQSXUHRXROEMXEINSXINFRGTXDREIXAUFFLIEGERSTRASZE"
                    + "MITANFANGXEINSSEQSXKMXKMXOSTWXKAMENECXK",
                    "Message key LSD, sent as YPJ at CRS. " + BarbarossaSource))),
        new(
            "carter-weather",
            null,
            new MessageSource(
                SourceKind.Intercept,
                "Carter's weather crib",
                "Sixteen letters of a Navy weather message, used to train the Wrens who ran the Bombes and now to "
                + "demonstrate the rebuilt Bombe at Bletchley Park. The plain text is a weather forecast.",
                "SNMK GGST ZZUG ARLV",
                null,
                MessageSource.Letters("SNMKGGSTZZUGARLV"),
                Crib.Parse("WETTERVORHERSAGE"),
                new Solution(
                    ReflectorType.B,
                    WheelOrder.Parse("II V III"),
                    Rings("26 26 26"),
                    Plugs("AD ET HM LJ NV UF ZP GQ XO IK"),
                    RotorPositions.Parse("ULA"),
                    "WETTERVORHERSAGE",
                    "Frank Carter, Rutherford Journal 3. Carter reads the stop as DKX; this key "
                    + "is the one the crib gives on this simulator (the Bombe stops at core positions VMB)."))),
    ];

    /// <summary>The intercept with <paramref name="id"/>, or null.</summary>
    public static Intercept? Find(string id) => All.FirstOrDefault(intercept => intercept.Id == id);

    private static IReadOnlyList<RingSetting> Rings(string numbers) =>
        [.. numbers.Split(' ').Select(n => RingSetting.FromNumber(int.Parse(n, System.Globalization.CultureInfo.InvariantCulture)))];

    private static IReadOnlyList<PlugPair> Plugs(string pairs) => [.. pairs.Split(' ').Select(PlugPair.Parse)];
}
