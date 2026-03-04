import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectDetails'>;

export default function ProjectDetails({ route }: Props) {
    const { projectName, status: initialStatus } = route.params;
    const [status, setStatus] = useState(initialStatus);

    // Mock de materiais
    const materials = [
        { id: 'm1', type: 'MDF', desc: 'Guararapes - Freijó 18mm', qty: 4 },
        { id: 'm2', type: 'MDF', desc: 'Araucária - Branco TX 15mm', qty: 6 },
        { id: 'f1', type: 'Ferragem', desc: 'Dobradiça com Amortecedor', qty: 24 },
        { id: 'f2', type: 'Ferragem', desc: 'Corrediça Telescópica 45cm', qty: 8 },
    ];

    const handleStatusAdvance = () => {
        if (status === 'Produção') {
            setStatus('Montagem');
            Alert.alert('Status Atualizado', 'Projeto avançou para "Montagem". O estoque de MDF foi baixado automaticamente (Simulação).');
        } else if (status === 'Montagem') {
            setStatus('Concluído');
            Alert.alert('Status Atualizado', 'Projeto Concluído! Parabéns pelo trabalho.');
        }
    };

    const handleUploadPhoto = () => {
        Alert.alert('Upload de Foto', 'Abrindo câmera para registrar o avanço da montagem...');
    };

    return (
        <ScrollView style={styles.container}>
            {/* Informações da Obra */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Status Atual</Text>
                <Text style={styles.statusText}>Fase: {status}</Text>
                {status !== 'Concluído' && (
                    <TouchableOpacity style={styles.btnPrimary} onPress={handleStatusAdvance}>
                        <Text style={styles.btnTextPrimary}>
                            Avançar para {status === 'Produção' ? 'Montagem' : 'Concluído'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Upload de Fotos */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Evidências de Montagem</Text>
                <Text style={styles.infoText}>Mantenha o sistema atualizado com fotos do progresso.</Text>
                <TouchableOpacity style={styles.btnSecondary} onPress={handleUploadPhoto}>
                    <Text style={styles.btnTextSecondary}>📷 Tirar Foto / Galeria</Text>
                </TouchableOpacity>
            </View>

            {/* Lista de Insumos (MDF e Ferragens) */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Lista de Insumos da Obra</Text>
                {materials.map(mat => (
                    <View key={mat.id} style={styles.materialRow}>
                        <View>
                            <Text style={styles.materialType}>{mat.type}</Text>
                            <Text style={styles.materialDesc}>{mat.desc}</Text>
                        </View>
                        <Text style={styles.materialQty}>x{mat.qty}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    section: {
        backgroundColor: '#fff',
        padding: 16,
        marginTop: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#E5E7EB'
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
    statusText: { fontSize: 16, color: '#4B5563', marginBottom: 12, fontWeight: '500' },
    infoText: { fontSize: 14, color: '#6B7280', marginBottom: 16 },

    btnPrimary: { backgroundColor: '#4F46E5', padding: 14, borderRadius: 8, alignItems: 'center' },
    btnTextPrimary: { color: '#fff', fontSize: 16, fontWeight: '600' },

    btnSecondary: { backgroundColor: '#F3F4F6', padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB' },
    btnTextSecondary: { color: '#374151', fontSize: 16, fontWeight: '600' },

    materialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    materialType: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase', fontWeight: 'bold' },
    materialDesc: { fontSize: 15, color: '#111827', marginTop: 2 },
    materialQty: { fontSize: 16, fontWeight: '700', color: '#4F46E5' },
});
