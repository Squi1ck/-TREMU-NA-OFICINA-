// gestures.js
// Analisa os 21 pontos da mão detetados pelo MediaPipe
// e devolve a letra LGP correspondente (ou null)
//
// Os 21 landmarks:
//  0 = pulso
//  1-4  = polegar  (base → ponta)
//  5-8  = indicador
//  9-12 = médio
// 13-16 = anelar
// 17-20 = mindinho
// y cresce para baixo; x cresce para a direita (imagem espelhada)

function dist(a, b) {
    return Math.sqrt(
        (a.x - b.x) ** 2 +
        (a.y - b.y) ** 2 +
        (a.z - b.z) ** 2
    );
}

// Dedo levantado = ponta está ACIMA da articulação intermédia
function up(lm, tip, mid) {
    return lm[tip].y < lm[mid].y;
}

// Dois pontos estão perto um do outro?
function near(a, b, t = 0.07) {
    return dist(a, b) < t;
}

function classificarGesto(lm) {
    // Estado dos 4 dedos
    const iUp = up(lm, 8, 6);   // indicador
    const mUp = up(lm, 12, 10);  // médio
    const aUp = up(lm, 16, 14);  // anelar
    const pUp = up(lm, 20, 18);  // mindinho (pinky)

    // Polegar estendido para o lado
    // (imagem espelhada: ponta do polegar à esquerda da articulação = estendido)
    const tUp = lm[4].x < lm[3].x;

    // Atalhos
    const nenhumUp = !iUp && !mUp && !aUp && !pUp;
    const apenasI = iUp && !mUp && !aUp && !pUp;
    const IM = iUp && mUp && !aUp && !pUp;

    // ── A ── punho fechado (nenhum dedo levantado, polegar ao lado)
    if (nenhumUp && !tUp) return 'A';

    // ── B ── 4 dedos levantados, polegar dentro
    if (iUp && mUp && aUp && pUp && !tUp) return 'B';

    // ── C ── forma de arco, indicador perto do polegar
    if (nenhumUp && near(lm[8], lm[4], 0.13)) return 'C';

    // ── O ── círculo fechado: polegar toca ponta do indicador (mais apertado que C)
    if (nenhumUp && near(lm[4], lm[8], 0.06)) return 'O';

    // ── D ── indicador levantado, polegar toca médio
    if (apenasI && near(lm[4], lm[12], 0.09)) return 'D';

    // ── E ── todos dobrados com pontas baixas (abaixo da base)
    if (nenhumUp && lm[8].y > lm[5].y && lm[12].y > lm[9].y) return 'E';

    // ── F ── indicador + polegar formam círculo, outros 3 levantados
    if (!iUp && mUp && aUp && pUp && near(lm[8], lm[4], 0.07)) return 'F';

    // ── G ── indicador aponta para o lado (horizontal)
    if (apenasI && Math.abs(lm[8].y - lm[5].y) < 0.05 && !tUp) return 'G';

    // ── H ── indicador + médio horizontais
    if (IM && Math.abs(lm[8].y - lm[12].y) < 0.06 && !tUp) return 'H';

    // ── I ── só mindinho levantado
    if (!iUp && !mUp && !aUp && pUp && !tUp) return 'I';

    // ── Y ── polegar + mindinho (shaka 🤙)
    if (!iUp && !mUp && !aUp && pUp && tUp) return 'Y';

    // ── L ── indicador levantado + polegar estendido (forma L)
    if (apenasI && tUp) return 'L';

    // ── K ── indicador + médio, polegar toca ponta do médio
    if (IM && near(lm[4], lm[12], 0.09) && !tUp) return 'K';

    // ── R ── indicador + médio muito juntos (cruzados)
    if (IM && Math.abs(lm[8].x - lm[12].x) < 0.04 && !tUp) return 'R';

    // ── U ── indicador + médio paralelos (juntos mas não cruzados)
    if (IM && Math.abs(lm[8].x - lm[12].x) < 0.07 && !tUp) return 'U';

    // ── V ── indicador + médio em V (afastados)
    if (IM && Math.abs(lm[8].x - lm[12].x) >= 0.07 && !tUp) return 'V';

    // ── P ── indicador + médio apontados para baixo
    if (IM && lm[8].y > lm[6].y + 0.08 && !tUp) return 'P';

    // ── W ── 3 dedos levantados (indicador, médio, anelar)
    if (iUp && mUp && aUp && !pUp) return 'W';

    // ── S ── punho fechado, polegar POR CIMA dos dedos
    if (nenhumUp && tUp && lm[4].y < lm[8].y) return 'S';

    // ── T ── polegar entre indicador e médio (ponta perto da art. do indicador)
    if (nenhumUp && near(lm[4], lm[6], 0.07)) return 'T';

    // ── M ── 3 dedos dobrados sobre polegar
    if (nenhumUp && lm[8].y > lm[4].y && lm[12].y > lm[4].y && lm[16].y > lm[4].y) return 'M';

    // ── N ── 2 dedos sobre polegar (como M mas anelar não cobre)
    if (nenhumUp && lm[8].y > lm[4].y && lm[12].y > lm[4].y && lm[16].y < lm[4].y) return 'N';

    // ── X ── indicador em gancho (dobrado a meio)
    if (!iUp && !mUp && !aUp && !pUp && lm[8].y > lm[7].y && lm[7].y < lm[6].y) return 'X';

    // ── Q ── como G mas indicador aponta para baixo
    if (apenasI && tUp && lm[8].y > lm[5].y + 0.05) return 'Q';

    // ── Z ── só indicador levantado sem polegar (simplificado; Z real usa movimento)
    if (apenasI && !tUp) return 'Z';

    return null; // gesto não reconhecido
}