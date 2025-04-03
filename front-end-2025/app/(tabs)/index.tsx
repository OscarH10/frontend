import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import RNFS from "react-native-fs"; // Para leer la imagen como base64
import axios from "axios"; // Para enviar la solicitud
import { launchImageLibrary } from "react-native-image-picker";

const API_URL = "http://192.168.1.254:8000/images/upload";

export default function App() {
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [refrescando, setRefrescando] = useState<boolean>(false);
  const [imagenSeleccionada, setImagenSeleccionada] = useState<string | null>(null);

  const seleccionarImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("¡Se necesita permiso para acceder a la galería!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // ← Obsoleto
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setImagenSeleccionada(uri);
      subirImagen(uri);
    }
  };

  const subirImagen = async (uri: string) => {
    try {
      setCargando(true);
      
      // Extraer el tipo MIME y el nombre del archivo
      const fileType = uri.split('.').pop() || 'jpg';
      const fileName = `imagen-${Date.now()}.${fileType}`;
      
      // Crear FormData
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${fileType}`,
      } as any); // Necesario para evitar errores de tipo en React Native
  
      // Configuración de la petición
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });
  
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
  
      const data = await response.json();
      console.log('Respuesta del servidor:', data);
      
      await obtenerImagenes();
    } catch (error) {
      console.error('Error al subir la imagen:', error);
      // Puedes mostrar un alerta al usuario aquí si lo deseas
      Alert.alert('Error', 'No se pudo subir la imagen');
    } finally {
      setCargando(false);
    }
  };
  const obtenerImagenes = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      if (response.ok) {
        setImagenes(data.images); // Actualizar el estado con las imágenes recibidas
        console.log('Imágenes obtenidas:', data.images);
      } else {
        console.error('Error al obtener imágenes:', data);
      }
    } catch (error) {
      console.error('Error al obtener imágenes:', error);
    }
  };

  const onRefresh = async () => {
    setRefrescando(true);
    await obtenerImagenes();
    setRefrescando(false);
  };

  useEffect(() => {
    obtenerImagenes();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Galería</Text>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Subiendo imagen...</Text>
        </View>
      ) : (
        <FlatList
          data={imagenes}
          keyExtractor={(item, index) => index.toString()}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.noImagesText}>No hay imágenes disponibles.</Text>
          }
        />
      )}

      <TouchableOpacity style={styles.button} onPress={seleccionarImagen}>
        <Text style={styles.buttonText}>Seleccionar Imagen</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    padding: 50,
  },
  gridContainer: {
    paddingHorizontal: 10,
    paddingBottom: 80,
  },
  imageWrapper: {
    flex: 1,
    margin: 5,
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  noImagesText: {
    textAlign: "center",
    fontSize: 18,
    color: "gray",
    marginTop: 20,
  },
  button: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#007BFF",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#007BFF",
  },
});