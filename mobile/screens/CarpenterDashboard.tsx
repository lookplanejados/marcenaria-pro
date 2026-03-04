import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

type Props = {
    navigation: DashboardScreenNavigationProp;
};

// Mock de dados para o Marceneiro
const myProjects = [
    { id: '1', clientName: 'Cozinha Planejada - Sra. Mariana', status: 'Produção', deadline: '2026-03-10' },
    { id: '3', clientName: 'Móveis Banheiro Suite', status: 'Montagem', deadline: '2026-03-05' },
];

export default function CarpenterDashboard({ navigation }: Props) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Produção': return '#F59E0B'; // amber-500
            case 'Montagem': return '#3B82F6'; // blue-500
            case 'Concluído': return '#10B981'; // emerald-500
            default: return '#6B7280'; // gray-500
        }
    };

    const renderProject = ({ item }: { item: typeof myProjects[0] }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ProjectDetails', {
                projectId: item.id,
                projectName: item.clientName,
                status: item.status
            })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.clientName}>{item.clientName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
            <View style={styles.cardBody}>
                <Text style={styles.deadlineText}>Prazo: {item.deadline}</Text>
                <Text style={styles.actionText}>Toque para ver detalhes e materiais &rarr;</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.greeting}>Olá, Marceneiro</Text>
                <Text style={styles.subtitle}>Aqui estão seus projetos ativos</Text>
            </View>

            <FlatList
                data={myProjects}
                keyExtractor={item => item.id}
                renderItem={renderProject}
                contentContainerStyle={styles.listContainer}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    greeting: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    listContainer: { padding: 16 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    clientName: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    cardBody: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
    deadlineText: { fontSize: 14, color: '#4B5563', marginBottom: 8 },
    actionText: { fontSize: 13, color: '#4F46E5', fontWeight: '500' },
});
