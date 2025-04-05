import "./polyfills";
import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "./components/screens/Home";
import ChainsChoose from "./components/screens/ChainsChoose";
import ProvidersContext from "./components/utils/ProvidersContext";
import TokensChoose from "./components/screens/TokensChoose";
import AccountProfile from "./components/screens/AccountProfile";
import { useFonts } from "expo-font";
import PaymentPreferences from "./components/screens/PaymentPreferences";
import Investments from "./components/screens/Investments";
import CrossChainPayment from "./components/screens/CrossChainPayment";
import Portfolio from "./components/screens/Portfolio";
import { GlobalContextProvider } from "./context/GlobalContext";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { PaymentProvider } from './components/utils/PaymentContext';

const Stack = createNativeStackNavigator();

// App theme
const theme = {
  colors: {
    primary: '#2F28D0',
    accent: '#9583FF',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#121212',
    error: '#CF6679',
    onBackground: '#121212',
    onSurface: '#121212',
  },
};

export default function App() {
  const [loaded, error] = useFonts({
    Arame: require("./assets/fonts/Arame/Arame.ttf"),
    Roboto: require("./assets/fonts/Roboto/Roboto-Regular.ttf"),
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <PaperProvider theme={theme}>
        <ProvidersContext>
          <GlobalContextProvider>
            <PaymentProvider>
              <NavigationContainer>
                <Stack.Navigator
                  initialRouteName="Home"
                  screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name="Home" component={Home} />
                  <Stack.Screen name="AccountProfile" component={AccountProfile} />
                  <Stack.Screen name="CrossChainPayment" component={CrossChainPayment} />
                  <Stack.Screen 
                    name="TokensChoose" 
                    component={TokensChoose}
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen 
                    name="ChainsChoose" 
                    component={ChainsChoose}
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name={"PaymentPreferences"}
                    component={PaymentPreferences}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name={"Investments"}
                    component={Investments}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name={"Portfolio"}
                    component={Portfolio}
                    options={{ headerShown: false }}
                  />
                </Stack.Navigator>
              </NavigationContainer>
            </PaymentProvider>
          </GlobalContextProvider>
        </ProvidersContext>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
