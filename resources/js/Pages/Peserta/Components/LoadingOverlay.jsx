import LoadingOverlay from "@/Pages/Peserta/Components/LoadingOverlay";

export default function StartUjian() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExpired, setIsExpired] = useState(false);

    return (
        <>
            {isSubmitting && (
                <LoadingOverlay message="Mengirim jawaban ujian..." />
            )}

            {isExpired && (
                <LoadingOverlay message="Waktu ujian telah habis" />
            )}

            {/* UI ujian di bawah */}
        </>
    );
}
