import React from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AccountSVG from "../assets/navigation/account-svg.svg";
import HistorySVG from "../assets/navigation/history-svg.svg";
import ButtonAddSvg from "../assets/navigation/button-add-svg.svg";
import { MaterialIcons } from '@expo/vector-icons';

// Define the navigation param list
type RootStackParamList = {
  Home: undefined;
  ChainsChoose: undefined;
  TokensChoose: undefined;
  AccountProfile: undefined;
  PaymentPreferences: undefined;
  Investments: undefined;
  CrossChainPayment: undefined;
  Portfolio: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  active?: string;
  navigation?: NavigationProp;
};

export default function NavigationBar({ active, navigation: propNavigation }: Props) {
  const route = useRoute() as any;
  const navigationHook = useNavigation<NavigationProp>();

  // Use navigation from props if provided, otherwise use the hook
  const navigation = propNavigation || navigationHook;

  // Determine the active route either from props or route
  const activeRoute = active || route.name;

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: "#2F28D0",
        borderTopRightRadius: 5,
        borderTopLeftRadius: 5,
        flexDirection: "row",
        alignItems: "center",
        position: "absolute",
        bottom: 0,
        left: 0,
        paddingBottom: "5%",
        zIndex: 100,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          gap: 30,
          marginRight: "auto",
          paddingLeft: 15,
          paddingTop: 15,
        }}
      >
        <Pressable
          style={{
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 5,
            padding: 5,
          }}
          onPress={() => navigation.navigate("PaymentPreferences")}
        >
          <MaterialIcons name="payment" size={26} color="white" />
          <Text
            style={{ color: "white", fontSize: 12, fontWeight: "600" }}
          >
            Payments
          </Text>
          {(activeRoute === "PaymentPreferences" || activeRoute === "CrossChainPayment") && (
            <View
              style={{
                width: "100%",
                height: 3,
                backgroundColor: "white",
              }}
            />
          )}
        </Pressable>
        
        <Pressable
          style={{
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 5,
            padding: 5,
          }}
          onPress={() => navigation.navigate("Home")}
        >
          <MaterialIcons name="home" size={26} color="white" />
          <Text
            style={{ color: "white", fontSize: 12, fontWeight: "600" }}
          >
            Home
          </Text>
          {activeRoute === "Home" && (
            <View
              style={{
                width: "100%",
                height: 3,
                backgroundColor: "white",
              }}
            />
          )}
        </Pressable>
      </View>
      <Pressable
        style={{
          zIndex: 2,
          position: "absolute",
          top: "-50%",
          left: "40%",
        }}
        onPress={() => navigation.navigate("CrossChainPayment")}
      >
        <ButtonAddSvg width={81} height={81} />
      </Pressable>
      <View
        style={{
          flexDirection: "row",
          gap: 15, // Reduce gap to fit the new tab
          marginLeft: "auto",
          paddingRight: 15,
          paddingTop: 15,
        }}
      >
        <Pressable
          style={{
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 5,
            padding: 5,
          }}
          onPress={() => navigation.navigate("Portfolio")}
        >
          <MaterialIcons name="account-balance-wallet" size={26} color="white" />
          <Text
            style={{ color: "white", fontSize: 12, fontWeight: "600" }}
          >
            Portfolio
          </Text>
          {activeRoute === "Portfolio" && (
            <View
              style={{
                width: "100%",
                height: 3,
                backgroundColor: "white",
              }}
            />
          )}
        </Pressable>
        <Pressable
          style={{
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 5,
            padding: 5,
          }}
          onPress={() => navigation.navigate("Investments")}
        >
          <MaterialIcons name="trending-up" size={26} color="white" />
          <Text
            style={{ color: "white", fontSize: 12, fontWeight: "600" }}
          >
            Invest
          </Text>
          {activeRoute === "Investments" && (
            <View
              style={{
                width: "100%",
                height: 3,
                backgroundColor: "white",
              }}
            />
          )}
        </Pressable>
        <Pressable
          style={{
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 5,
            padding: 5,
          }}
          onPress={() => navigation.navigate("AccountProfile")}
        >
          <AccountSVG width={26} height={26} />
          <Text
            style={{ color: "white", fontSize: 12, fontWeight: "600" }}
          >
            Account
          </Text>
          {activeRoute === "AccountProfile" && (
            <View
              style={{
                width: "100%",
                height: 3,
                backgroundColor: "white",
              }}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}
