using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Machine;

public sealed class HistoricalVectorTests
{
    [Fact]
    public void Should_encrypt_AAAAA_to_BDZGO_When_M3_has_default_settings()
    {
        // Arrange
        var machine = MachineBuilder.Build(MachineModel.M3, "B", "I II III", "01 01 01", "", "AAA");

        // Act
        var ciphertext = machine.Type("AAAAA");

        // Assert
        Assert.Equal("BDZGO", ciphertext);
    }

    [Fact]
    public void Should_decrypt_the_U264_message_When_M4_uses_its_key()
    {
        // Arrange
        // U-264 (Kapitänleutnant Hartwig Looks), 19 November 1942. Broken by the M4 Project in 2006.
        var machine = MachineBuilder.Build(
            MachineModel.M4, "B-thin", "Beta II IV I", "01 01 01 22", "AT BL DF GJ HM NW OP QY RZ VX", "VJNA");
        const string ciphertext =
            "NCZW VUSX PNYM INHZ XMQX SFWX WLKJ AHSH NMCO CCAK UQPM KCSM HKSE INJU SBLK IOSX CKUB HMLL " +
            "XCSJ USRR DVKO HULX WCCB GVLI YXEO AHXR HKKF VDRE WEZL XOBA FGYU JQUK GRTV UKAM EURB VEKS " +
            "UHHV OYHA BCJW MAKL FKLM YFVN RIZR VVRT KOFD ANJM OLBG FFLE OPRG TFLV RHOW OPBE KVWM UQFM " +
            "PWPA RMFH AGKX IIBG";
        const string plaintext =
            "VONV ONJL OOKS JHFF TTTE INSE INSD REIZ WOYY QNNS NEUN INHA LTXX BEIA NGRI FFUN TERW ASSE " +
            "RGED RUEC KTYW ABOS XLET ZTER GEGN ERST ANDN ULAC HTDR EINU LUHR MARQ UANT ONJO TANE UNAC " +
            "HTSE YHSD REIY ZWOZ WONU LGRA DYAC HTSM YSTO SSEN ACHX EKNS VIER MBFA ELLT YNNN NNNO OOVI " +
            "ERYS ICHT EINS NULL";

        // Act
        var decrypted = machine.Type(ciphertext);

        // Assert
        Assert.Equal(MachineBuilder.Letters(plaintext), decrypted);
    }

    [Fact]
    public void Should_decrypt_the_Scharnhorst_message_When_M3_uses_its_key()
    {
        // Arrange
        // Schlachtschiff Scharnhorst, 26 December 1943 (Operation Ostfront).
        var machine = MachineBuilder.Build(
            MachineModel.M3, "B", "III VI VIII", "01 08 13", "AN EZ HK IJ LR MQ OT PV SW UX", "UZV");
        const string ciphertext =
            "YKAE NZAP MSCH ZBFO CUVM RMDP YCOF HADZ IZME FXTH FLOL PZLF GGBO TGOX GRET DWTJ IQHL MXVJ " +
            "WKZU ASTR";
        const string plaintext =
            "STEU EREJ TANA FJOR DJAN STAN DORT QUAA ACCC VIER NEUN NEUN ZWOF AHRT ZWON ULSM XXSC HARN " +
            "HORS THCO";

        // Act
        var decrypted = machine.Type(ciphertext);

        // Assert
        Assert.Equal(MachineBuilder.Letters(plaintext), decrypted);
    }

    [Fact]
    public void Should_decrypt_the_Barbarossa_message_When_M3_uses_its_key()
    {
        // Arrange
        // Operation Barbarossa, 7 July 1941, part 1. Message key BLA.
        var machine = MachineBuilder.Build(
            MachineModel.M3, "B", "II IV V", "02 21 12", "AV BS CG DL FU HZ IN KM OW RX", "BLA");
        const string ciphertext =
            "EDPUD NRGYS ZRCXN UYTPO MRMBO FKTBZ REZKM LXLVE FGUEY SIOZV EQMIK UBPMM YLKLT TDEIS MDICA " +
            "GYKUA CTCDO MOHWX MUUIA UBSTS LRNBZ SZWNR FXWFY SSXJZ VIJHI DISHP RKLKA YUPAD TXQSP INQMA " +
            "TLPIF SVKDA SCTAC DPBOP VHJK";
        const string plaintext =
            "AUFKL XABTE ILUNG XVONX KURTI NOWAX KURTI NOWAX NORDW ESTLX SEBEZ XSEBE ZXUAF FLIEG ERSTR " +
            "ASZER IQTUN GXDUB ROWKI XDUBR OWKIX OPOTS CHKAX OPOTS CHKAX UMXEI NSAQT DREIN ULLXU HRANG " +
            "ETRET ENXAN GRIFF XINFX RGTX";

        // Act
        var decrypted = machine.Type(ciphertext);

        // Assert
        Assert.Equal(MachineBuilder.Letters(plaintext), decrypted);
    }
}
