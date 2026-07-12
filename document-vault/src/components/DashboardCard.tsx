import { View, Text } from "react-native";


type DashboardCardProps = {
  title: string;
  value: number;
};


export default function DashboardCard({
  title,
  value,
}: DashboardCardProps) {
  return (
  <View>
    <Text>{title}</Text>
    <Text>{value}</Text>
  </View>
  );
}