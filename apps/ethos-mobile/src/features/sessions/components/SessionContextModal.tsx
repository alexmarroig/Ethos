import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, useColorScheme } from 'react-native';
import { colors } from '../theme/colors';
import { CheckCircle, Edit, Trash2 } from 'lucide-react-native';

interface Props {
    visible: boolean;
    onClose: () => void;
    onValidate: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function SessionContextModal({ visible, onClose, onValidate, onEdit, onDelete }: Props) {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.sheet, { backgroundColor: theme.card }]}>
                            <Text style={[styles.title, { color: theme.mutedForeground }]}>Ações da Sessão</Text>

                            <TouchableOpacity style={[styles.actionButton, { borderBottomColor: theme.border }]} onPress={() => { onValidate(); onClose(); }}>
                                <CheckCircle size={20} color={theme.statusValidated} />
                                <Text style={[styles.actionText, { color: theme.foreground }]}>Validar Prontuário</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.actionButton, { borderBottomColor: theme.border }]} onPress={() => { onEdit(); onClose(); }}>
                                <Edit size={20} color={theme.primary} />
                                <Text style={[styles.actionText, { color: theme.foreground }]}>Editar Detalhes</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.actionButton, { borderBottomColor: 'transparent' }]} onPress={() => { onDelete(); onClose(); }}>
                                <Trash2 size={20} color={theme.statusPending} />
                                <Text style={[styles.actionText, { color: theme.statusPending }]}>Excluir Sessão</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    title: {
        fontFamily: 'Inter',
        fontSize: 13,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    actionText: {
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 12,
    }
});
